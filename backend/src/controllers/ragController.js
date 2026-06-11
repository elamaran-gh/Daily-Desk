const { QdrantClient } = require("@qdrant/js-client-rest");
const Entry = require("../models/entryModel");

const COLLECTION_NAME = "journal_entries";
const qdrant = new QdrantClient({ url: process.env.QDRANT_URL, apiKey: process.env.QDRANT_API_KEY });

const getEmbedding = async (text) => {
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "openai/text-embedding-3-small", input: text }),
  });
  const data = await response.json();
  return data.data[0].embedding;
};

const ensureCollection = async () => {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);
  if (!exists) {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: { size: 1536, distance: "Cosine" },
    });
    await qdrant.createPayloadIndex(COLLECTION_NAME, {
      field_name: "userId",
      field_schema: "keyword",
    });
  }
};

const indexEntry = async (req, res) => {
  try {
    const { entryId } = req.body;
    const loggedUser = req.user;
    const entry = await Entry.findOne({ _id: entryId, createdBy: loggedUser._id });
    if (!entry) return res.status(404).json({ message: "Entry not found!" });

    const text = `Title: ${entry.title}\nDate: ${entry.date}\nMood: ${entry.mood}\nContent: ${entry.content}`;
    const embedding = await getEmbedding(text);
    await ensureCollection();

    const numericId = parseInt(entry._id.toString().slice(-8), 16);
    await qdrant.upsert(COLLECTION_NAME, {
      points: [{
        id: numericId,
        vector: embedding,
        payload: {
          entryId: entry._id.toString(),
          userId: loggedUser._id.toString(),
          title: entry.title,
          date: entry.date,
          mood: entry.mood,
          content: entry.content,
        },
      }],
    });
    console.log("Entry indexed successfully!", entryId);
    res.status(200).json({ message: "Entry indexed successfully!" });
  } catch (error) {
    console.error("Error indexing entry:", error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

const askJournal = async (req, res) => {
  try {
    const { question } = req.body;
    const loggedUser = req.user;

    if (!question?.trim()) return res.status(400).json({ message: "Question is required!" });

    await ensureCollection();

    const questionEmbedding = await getEmbedding(question);

    const searchResult = await qdrant.search(COLLECTION_NAME, {
      vector: questionEmbedding,
      limit: 5,
      score_threshold: 0.0,
      with_payload: true,
      filter: {
        must: [{ key: "userId", match: { value: loggedUser._id.toString() } }],
      },
    });

    console.log("Search results:", JSON.stringify(searchResult, null, 2));
    if (searchResult.length === 0) {
      return res.status(200).json({
        answer: "I couldn't find any journal entries related to your question. Try writing some entries first!",
      });
    }

    const context = searchResult
      .map((r, i) => `Entry ${i + 1}:\nTitle: ${r.payload.title}\nDate: ${new Date(r.payload.date).toDateString()}\nMood: ${r.payload.mood}\nContent: ${r.payload.content}`)
      .join("\n\n");

    const llmResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct",
        messages: [
          {
            role: "system",
            content: `You are a personal journal assistant. Answer the user's question ONLY based on the journal entries provided below.
If the answer is not found in the entries, say exactly: "I couldn't find anything about that in your journal entries."
Do not make up or assume anything outside the provided entries.
Be concise and helpful.

Journal Entries:
${context}`,
          },
          { role: "user", content: question },
        ],
      }),
    });

    const llmData = await llmResponse.json();
    console.log("LLM Response:", JSON.stringify(llmData, null, 2));
    const answer = llmData.choices?.[0]?.message?.content || "I couldn't generate an answer. Please try again.";
    res.status(200).json({ answer, sources: searchResult.length });
  } catch (error) {
    console.error("Error asking journal:", error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

module.exports = { indexEntry, askJournal };
