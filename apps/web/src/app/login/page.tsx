import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "var(--color-surface)" }}
    >
      <div className="mb-8 text-center">
        <h1
          className="text-3xl font-bold mb-1"
          style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }}
        >
          La Mița Biciclista
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Platformă de ospitalitate — acces personal
        </p>
      </div>
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#2C4A2E",
            colorBackground: "#FFFFFF",
            fontFamily: "Inter, sans-serif",
          },
        }}
        routing="path"
        path="/login"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
