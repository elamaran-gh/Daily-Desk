import apiSlice from "./apiSlice";

const ragApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    askJournal: builder.mutation({
      query: (data) => ({
        url: "/rag/ask",
        method: "POST",
        body: data,
      }),
    }),
    indexEntry: builder.mutation({
      query: (data) => ({
        url: "/rag/index",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const { useAskJournalMutation, useIndexEntryMutation } = ragApiSlice;
