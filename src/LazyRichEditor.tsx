import { lazy, Suspense, type ComponentProps } from "react";
const LoadedEditor = lazy(() =>
  import("./RichEditor").then((module) => ({ default: module.RichEditor })),
);
export type { RichEditorInstance } from "./RichEditor";
export function RichEditor(props: ComponentProps<typeof LoadedEditor>) {
  return (
    <Suspense
      fallback={
        <div role="status" aria-busy="true" className="editor-loading">
          Preparando escritura…
        </div>
      }
    >
      <LoadedEditor {...props} />
    </Suspense>
  );
}
