import { SafeAreaInsets } from "@/types";

interface SafeAreaContainerProps {
  children: React.ReactNode;
  insets?: SafeAreaInsets;
}

export const SafeAreaContainer = ({
  children,
  insets,
}: SafeAreaContainerProps) => (
  <main
    className="flex h-full w-full flex-col items-center justify-center gap-y-3 overflow-auto"
    style={{
      paddingTop: insets?.top ?? 0,
      paddingBottom: insets?.bottom ?? 0,
      paddingLeft: insets?.left ?? 0,
      paddingRight: insets?.right ?? 0,
    }}
  >
    {children}
  </main>
);
