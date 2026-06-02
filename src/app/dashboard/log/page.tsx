import { Suspense } from "react";
import LogRunContent from "./LogRunContent";

export default function LogPage() {
  return (
    <Suspense fallback={null}>
      <LogRunContent />
    </Suspense>
  );
}
