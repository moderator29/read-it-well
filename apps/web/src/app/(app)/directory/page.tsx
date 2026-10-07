import type { Metadata } from "next";
import { DirectoryScreen } from "@/components/app/directory/DirectoryScreen";
import { DIRECTORY_COPY } from "@/lib/directory/model";
import { readDirectory } from "@/lib/directory/read";
import { getSide } from "@/lib/side";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: DIRECTORY_COPY[await getSide()].title, robots: { index: false, follow: false } };
}

/**
 * /directory (D76): one directory, flipped by the side switch. Property lists
 * agents, landlords and firms; Stays lists hotels, hosts and shortlet
 * operators. Read through public.directory (pending migration d76); until it
 * is applied the page says it opens soon. Sample data at /preview/directory.
 */
export default async function DirectoryPage() {
  const side = await getSide();
  const read = await readDirectory(side);
  return <DirectoryScreen side={side} read={read} />;
}
