import EditStudentPage from "@/components/modules/students/EditStudentPage";

type Props = { params: Promise<{ id: string }> };

const Page = ({ params }: Props) => <EditStudentPage params={params} />;
export default Page;