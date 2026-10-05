import { Image as PdfImage, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { SkillIcon } from "@/lib/skillIcons/resolveSkillIcon";

export interface SkillListItem {
  label: string;
  /** Omitted for a skill with no icon — it renders as a text-only chip. */
  icon?: SkillIcon;
}

interface SkillListProps {
  items: SkillListItem[];
  /** Capsule around each skill: fill, radius, horizontal padding and a fixed
   *  height, so chips with and without an icon line up. */
  chipStyle: Style;
  /** Text style of each skill name. */
  labelStyle: Style;
  /** Icon height in points. */
  iconSize: number;
  /** Space between an icon and its skill name. */
  iconGap: number;
  /** Space between chips, in both directions. */
  chipGap: number;
  /** Lifts the name so its letters, not its line box, sit on the chip's
   *  centre — a font's em-box leaves glyphs low (see how a template places
   *  its language flags). */
  labelOffsetTop?: number;
}

/**
 * A wrapping run of skill chips, each with its logo when it has one. Shared by
 * every template so a new template only supplies its own chip and text style
 * and sizes. The name is always real text beside the icon — never replaced by
 * it — so the resume still reads correctly to ATS software and copy-paste.
 */
export function SkillList({
  items,
  chipStyle,
  labelStyle,
  iconSize,
  iconGap,
  chipGap,
  labelOffsetTop = 0,
}: SkillListProps) {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "flex-start",
        gap: chipGap,
      }}
    >
      {items.map((item, index) => (
        <View
          key={`${item.label}-${index}`}
          wrap={false}
          style={[
            chipStyle,
            {
              flexDirection: "row",
              alignItems: "center",
              columnGap: iconGap,
              maxWidth: "100%",
            },
          ]}
        >
          {item.icon ? (
            <PdfImage
              src={item.icon.src}
              style={{
                width: iconSize * item.icon.widthRatio,
                height: iconSize,
                objectFit: "contain",
              }}
            />
          ) : null}
          <Text
            style={[
              labelStyle,
              { flexShrink: 1, position: "relative", top: -labelOffsetTop },
            ]}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
