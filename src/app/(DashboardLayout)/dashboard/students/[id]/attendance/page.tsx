import StudentAttendancePage from "@/components/modules/students/StudentAttendancePage";

type Props = { params: Promise<{ id: string }> };

const Page = ({ params }: Props) => <StudentAttendancePage params={params} />;
export default Page;
