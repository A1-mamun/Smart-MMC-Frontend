import StudentDetailPage from "@/components/modules/students/StudentDetailPage";

type Props = { params: Promise<{ id: string }> };

const Page = ({ params }: Props) => <StudentDetailPage params={params} />;
export default Page;