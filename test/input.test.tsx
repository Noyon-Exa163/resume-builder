import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { Input, type InputProps } from "@/components/ui";

function TypedInput(props: Omit<InputProps, "onChange">) {
  const [value, setValue] = useState(String(props.value ?? ""));
  return (
    <Input
      {...props}
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

describe("Input whitespace", () => {
  it("lets ordinary text fields keep spaces", () => {
    const { getByLabelText } = render(
      <TypedInput label="Professional Headline" value="DevOps" />,
    );
    const input = getByLabelText("Professional Headline");

    fireEvent.change(input, { target: { value: "DevOps Engineer" } });

    expect(input).toHaveProperty("value", "DevOps Engineer");
  });

  it("strips spaces from url fields, including paste", () => {
    const { getByLabelText } = render(
      <TypedInput
        label="Portfolio / Website"
        type="url"
        value="https://ada.dev"
      />,
    );
    const input = getByLabelText("Portfolio / Website");

    fireEvent.change(input, {
      target: { value: "https://ada.dev/my resume" },
    });

    expect(input).toHaveProperty("value", "https://ada.dev/myresume");
  });

  it("strips spaces from linkedin-style fields that opt in", () => {
    const { getByLabelText } = render(
      <TypedInput
        label="LinkedIn Profile"
        stripWhitespace
        value="linkedin.com/in/ada"
      />,
    );
    const input = getByLabelText("LinkedIn Profile");

    fireEvent.keyDown(input, { key: " " });
    fireEvent.change(input, {
      target: { value: "linkedin.com/in/ada lovelace" },
    });

    expect(input).toHaveProperty("value", "linkedin.com/in/adalovelace");
  });
});
