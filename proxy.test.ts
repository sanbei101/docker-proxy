import { describe, test, expect } from "vitest";
import { MakeTargetUrl } from "./src/index";

const PROXY_PREFIX = "https://proxy.sanbei101.xyz/";

function makeUrl(input: string): string {
  return PROXY_PREFIX + encodeURIComponent(input.trim());
}

const cases = [
  {
    name: "Ubuntu kernel deb",
    input: makeUrl(
      "https://kernel.ubuntu.com/mainline/v6.17.7/amd64/linux-headers-6.17.7-061707-generic_6.17.7-061707.202511021342_amd64.deb"
    ),
    output:
      "https://kernel.ubuntu.com/mainline/v6.17.7/amd64/linux-headers-6.17.7-061707-generic_6.17.7-061707.202511021342_amd64.deb",
  },
];

describe("Proxy Tests", () => {
  for (const { name, input, output } of cases) {
    console.log(name);
    console.log("Input:", input);
    console.log("Expected Output:", output);
    test(name, () => {
      expect(MakeTargetUrl(input)).toBe(output);
    });
  }
});
