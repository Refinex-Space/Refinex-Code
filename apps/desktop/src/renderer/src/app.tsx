import { Layout } from "./app/layout";
import { Providers } from "./app/providers";

export function App() {
  return (
    <Providers>
      <Layout />
    </Providers>
  );
}
