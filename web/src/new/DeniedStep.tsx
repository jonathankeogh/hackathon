import { Heading, Notice, Screen, Stack } from "../design";

/** The server refused: this page needs the admin link. One plain sentence. */
export function DeniedStep() {
  return (
    <Screen>
      <Stack gap={16}>
        <Heading level={1} size="title">
          Admin link needed
        </Heading>
        <Notice tone="error">Open this page from the admin link, the one that ends in ?key=, then try again.</Notice>
      </Stack>
    </Screen>
  );
}
