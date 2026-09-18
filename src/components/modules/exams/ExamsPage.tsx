"use client";
import { useState } from "react";
import { useGetAllExamsQuery } from "@/redux/features/exam/exam";
import type { TExamListItem, TExam, TExamSection } from "@/types/exam";
import Exams from "./Exams";
import type { TPaginationMeta } from "@/types/common";

const ExamsPage = () => {
  const [query, setQuery] = useState<Record<string, unknown>>({
    page: 1,
    limit: 20,
    // Last-created exam appears first. Matches the backend's `createdAt`
    // / `desc` default in `calculatePagination` and the user-stated
    // expectation ("by default sort the exam the last created exam should
    // appear first in the table"). Admins can override via the Sort filter
    // dropdown on the page below.
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const { data, isLoading, isFetching, refetch } = useGetAllExamsQuery(query);

  const meta = (data?.meta as TPaginationMeta | undefined) ?? null;
  const list: TExamListItem[] = (data?.data as TExamListItem[] | undefined) ?? [];

  return (
    <Exams
      exams={list}
      meta={meta}
      isLoading={isLoading}
      isFetching={isFetching}
      query={query}
      onQueryChange={setQuery}
      refetch={refetch}
    />
  );
};

export default ExamsPage;