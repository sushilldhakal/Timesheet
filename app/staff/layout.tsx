import { StaffLayoutClient } from "@/components/staff/layout/StaffLayoutClient"

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <StaffLayoutClient>{children}</StaffLayoutClient>
}
