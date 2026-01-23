import { http, createConfig } from "wagmi";
import { filecoin } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
  chains: [filecoin],
  connectors: [
    injected(),
  ],
  transports: {
    [filecoin.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
