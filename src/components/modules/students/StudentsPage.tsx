"use client";
import { useState } from "react";
import { useGetAllStudentsQuery } from "@/redux/features/student/student";
import Students from "./Students";
import type { TStudentQuery } from "@/types/student";

const StudentsPage = () => {
  // Defaults:
  //  - `courseStatus: "ONGOING"` — the default landing view shows
  //    students in the operationally relevant cohort (currently
  //    running batches). Admins can switch to Admission / Complete
  //    via the course-status tabs in the Students component.
  //  - `activeCoursesOnly: true` so archived enrollments don't
  //    pollute the list.
  //  - `isFreeAccount: false` so free-class accounts (which have
  //    no paid enrollment, no fee, and no NFC card) don't appear
  //    in the operations dashboard. Marketers can opt in to the
  //    free roster via the toggle in the Students component.
  const [query, setQuery] = useState<TStudentQuery>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
    activeCoursesOnly: true,
    isFreeAccount: false,
    courseStatus: "ONGOING",
  });
  const { data, isLoading, refetch, isFetching } = useGetAllStudentsQuery(query);

  return (
    <Students
      studentsData={data?.data || []}
      meta={data?.meta}
      isLoading={isLoading}
      isFetching={isFetching}
      query={query}
      onQueryChange={setQuery}
      refetch={refetch}
    />
  );
};

export default StudentsPage;