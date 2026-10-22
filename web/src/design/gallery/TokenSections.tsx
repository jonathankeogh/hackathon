import { Grid, Section, Specimen } from "./parts";
import { Label } from "../Label";
import { Stack } from "../Stack";
import { Text } from "../Text";
import {
  alphas,
  borders,
  colors,
  layout,
  motionTokens,
  radii,
  SPACE,
  textStyle,
  typeScale,
  withAlpha,
  type ColorToken,
  type TextRole,
} from "../tokens";

const ROLES: readonly TextRole[] = ["display", "title", "body", "label", "small"];
const SAMPLE: Record<TextRole, string> = {
  display: "Dinner for six",
  title: "Who is coming Thursday",
  body: "The venue unlocks when fifteen people say yes.",
  label: "Platform 3 / Departs 19:30",
  small: "Opacity 60% is the floor for anything readable.",
};

function Swatch({ token }: { token: ColorToken }) {
  return (
    <Stack gap={8}>
      <div style={{ height: 64, background: colors[token], border: `${borders.hairline}px solid ${colors.divider}` }} />
      <Label strong>{token}</Label>
      <Label>{colors[token]}</Label>
    </Stack>
  );
}

export function ColourSection() {
  return (
    <Section title="Colour">
      <Grid min={120}>
        {(Object.keys(colors) as ColorToken[]).map((token) => (
          <Swatch key={token} token={token} />
        ))}
      </Grid>
      <Specimen name="Text opacity steps">
        <Grid min={120}>
          {(Object.entries(alphas) as [string, number][]).map(([name, value]) => (
            <Stack key={name} gap={8}>
              <div style={{ height: 40, background: colors.bg, border: `${borders.hairline}px solid ${colors.divider}`, display: "flex", alignItems: "center", padding: "0 12px" }}>
                <span style={{ ...textStyle("label"), color: withAlpha("text", value) }}>Aa 123</span>
              </div>
              <Label>{`${name} ${Math.round(value * 100)}%`}</Label>
            </Stack>
          ))}
        </Grid>
      </Specimen>
      <Text size="small" muted>
        Red, amber and green are fills and surfaces. They never colour text.
      </Text>
    </Section>
  );
}

export function TypeSection() {
  return (
    <Section title="Type">
      <Stack gap={32}>
        {ROLES.map((role) => (
          <Specimen key={role} name={`${role}, ${typeScale[role].px.phone}px at 390, ${typeScale[role].px.desktop}px at 1440`}>
            <div style={{ ...textStyle(role), textTransform: role === "label" ? "uppercase" : undefined, overflowWrap: "anywhere" }}>{SAMPLE[role]}</div>
          </Specimen>
        ))}
      </Stack>
    </Section>
  );
}

export function SpaceSection() {
  return (
    <Section title="Spacing, borders, radii, layout">
      <Stack gap={12}>
        {SPACE.map((px) => (
          <div key={px} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Label style={{ width: 48 }}>{px}</Label>
            <div style={{ height: 16, width: px, background: colors.text }} />
          </div>
        ))}
      </Stack>
      <Grid min={200}>
        <Specimen name={`hairline ${borders.hairline}px`}>
          <div style={{ height: 48, border: `${borders.hairline}px solid ${colors.text}`, borderRadius: radii.none }} />
        </Specimen>
        <Specimen name={`outline ${borders.outline}px`}>
          <div style={{ height: 48, border: `${borders.outline}px solid ${colors.text}`, borderRadius: radii.none }} />
        </Specimen>
        <Specimen name={`radii: none ${radii.none}, disc ${radii.disc}`}>
          <div style={{ height: 48, width: 48, border: `${borders.outline}px solid ${withAlpha("text", alphas.ring)}`, borderRadius: radii.disc }} />
        </Specimen>
        <Specimen name={`gutters ${layout.gutter.phone} phone, ${layout.gutter.desktop} desktop; max ${layout.maxWidth.narrow} / ${layout.maxWidth.wide}`}>
          <Text size="small" muted>
            Breakpoint {layout.breakpoint}px. Touch target {layout.touch}px.
          </Text>
        </Specimen>
      </Grid>
    </Section>
  );
}

export function MotionSection() {
  const { durations, easing, settleMarginMs, flashMs } = motionTokens;
  return (
    <Section title="Motion">
      <Stack gap={8}>
        <Text>
          Fade, scale, translate, opacity and colour only. Fast {durations.fast}ms, base {durations.base}ms, slow {durations.slow}ms. Flash {flashMs}ms.
        </Text>
        <Text size="small" muted>
          Easing {easing}. Settle-net: every animation is forced to its end state {settleMarginMs}ms after it should have finished. Reduced motion renders end states at once.
        </Text>
      </Stack>
    </Section>
  );
}
