import { Heading } from "./Heading";
import { Label } from "./Label";
import { Screen } from "./Screen";
import { Stack } from "./Stack";
import { Text } from "./Text";
import { BoardSection, ButtonSection, FieldSection, LampSection, TextSection } from "./gallery/ComponentSections";
import { ColourSection, MotionSection, SpaceSection, TypeSection } from "./gallery/TokenSections";

/** The living gallery at /design: every token and component, in every state. */
export default function DesignGallery() {
  return (
    <Screen
      width="wide"
      header={<Label strong>Deadlock design system</Label>}
    >
      <Stack gap={16}>
        <Heading>Signal box</Heading>
        <Text muted>Tokens and components for the landing page, sign-up, join and the stage. Square, flat, fills not glows.</Text>
      </Stack>
      <ColourSection />
      <TypeSection />
      <SpaceSection />
      <MotionSection />
      <TextSection />
      <ButtonSection />
      <FieldSection />
      <LampSection />
      <BoardSection />
    </Screen>
  );
}
