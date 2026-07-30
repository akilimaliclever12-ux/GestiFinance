import { getMySchools } from "@/lib/data";
import { ImportClient } from "./ImportClient";

export default async function ImportPage() {
  const schools = await getMySchools();
  return <ImportClient schools={schools} />;
}
