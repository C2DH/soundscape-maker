import ThreeDStoriesLogo from "./svg/ThreeDStoriesLogo.tsx";
import UniLogo from "./svg/UniLogo.tsx";

export interface FooterProps {}

export function Footer({}: FooterProps) {
  const year = new Date().getFullYear();
  return (
    <footer className="p-4 text-center fixed bottom-2 left-0 w-full">
      <div className="flex gap-6 items-center justify-center mb-2">
        <UniLogo
          width={180}
          color="rgba(var(--light), 1)"
          className="w-6 h-6 ml-2"
        />
        <ThreeDStoriesLogo
          width={160}
          color="rgba(var(--light), 1)"
          className="w-6 h-6 mr-2"
        />
      </div>
      <p className="text-xs">Copyright University of Luxembourg {year}</p>
    </footer>
  );
}
