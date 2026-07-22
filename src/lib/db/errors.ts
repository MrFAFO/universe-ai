export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

export const PUBLIC_DATABASE_ERROR_MESSAGE =
  "Unable to load data right now. Please try again in a moment.";

export const PUBLIC_CREATE_WORLD_ERROR_MESSAGE =
  "Unable to create world. Please try again.";
