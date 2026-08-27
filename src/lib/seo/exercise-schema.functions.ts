import { createServerFn } from "@tanstack/react-start";

export type ExerciseSchemaItem = {
  n: string;
  e: string | null;
  t: string | null;
  d: string | null;
};

/**
 * Compact exercise list used only to emit JSON-LD (HowTo ItemList) in the
 * /exercise-library page head. Nothing here is rendered.
 */
export const getExerciseSchemaList = createServerFn({ method: "GET" }).handler(
  async (): Promise<ExerciseSchemaItem[]> => {
    const { readExerciseSchemaList } = await import("./exercise-schema.server");
    return readExerciseSchemaList();
  },
);
