import { AuthPage } from "@/components/auth/auth-page";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Đăng nhập | AHSO Warehouse",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordChanged?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthPage
      title="Đăng nhập"
    >
      <LoginForm
        notice={
          params.passwordChanged === "1"
            ? "Mật khẩu đã được đổi. Hãy đăng nhập bằng mật khẩu mới."
            : undefined
        }
      />
    </AuthPage>
  );
}
