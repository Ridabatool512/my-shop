import { auth } from "@/auth";
import SellerWallet from "@/app/seller/wallet/SellerWallet";
import { redirect } from "next/navigation";

export default async function SellerWalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/");

  return <SellerWallet />;
}
