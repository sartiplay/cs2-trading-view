import { ItemDetail } from "@/components/item-detail"
import { notFound } from "next/navigation"

interface ItemPageProps {
  params: Promise<{ hash: string }>
}

export default async function ItemPage({ params }: ItemPageProps) {
  const { hash } = await params

  if (!hash) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl">
        <ItemDetail hash={decodeURIComponent(hash)} />
      </div>
    </div>
  )
}
