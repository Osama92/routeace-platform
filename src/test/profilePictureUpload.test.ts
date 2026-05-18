import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PROFILE_PICTURE_MAX_BYTES,
  buildProfilePicturePath,
  getProfilePictureUploadErrorMessage,
  isOwnProfilePicturePath,
  validateProfilePictureFile,
} from "@/lib/profilePictureUpload";

const file = (name: string, type: string, size = 1024) =>
  new File([new Uint8Array(size)], name, { type });

const readProfilePictureMigrations = () => {
  const dir = join(process.cwd(), "supabase", "migrations");
  if (!existsSync(dir)) return "";
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => readFileSync(join(dir, name), "utf8"))
    .filter((sql) => sql.includes("profile-pictures") || sql.includes("profile_picture_upload_audit"))
    .join("\n");
};

describe("profile picture upload validation", () => {
  it("allows supported images at or below the 5MB limit", () => {
    expect(validateProfilePictureFile(file("avatar.png", "image/png")).valid).toBe(true);
    expect(validateProfilePictureFile(file("avatar.jpg", "image/jpeg", PROFILE_PICTURE_MAX_BYTES)).valid).toBe(true);
  });

  it("blocks non-images and oversized images before upload", () => {
    expect(validateProfilePictureFile(file("avatar.pdf", "application/pdf")).valid).toBe(false);
    expect(validateProfilePictureFile(file("avatar.png", "image/png", PROFILE_PICTURE_MAX_BYTES + 1)).valid).toBe(false);
  });

  it("always builds paths inside the authenticated user's own folder", () => {
    const userId = "81f3065a-a97c-4e4b-af28-9671537600d9";
    const path = buildProfilePicturePath(userId, file("avatar.webp", "image/webp"));

    expect(isOwnProfilePicturePath(userId, path)).toBe(true);
    expect(isOwnProfilePicturePath("00000000-0000-0000-0000-000000000000", path)).toBe(false);
  });

  it("maps policy denials to a safe user-friendly message", () => {
    expect(getProfilePictureUploadErrorMessage("new row violates row-level security policy")).toEqual({
      title: "Upload not allowed",
      description: "Please sign in again, then upload your own profile picture from your profile menu.",
    });
  });
});

describe("profile picture storage policy migrations", () => {
  it("keeps own-folder upload policy and server-side image limits in place", () => {
    const sql = readProfilePictureMigrations();

    expect(sql).toContain("file_size_limit = 5242880");
    expect(sql).toContain("allowed_mime_types");
    expect(sql).toContain("authenticated users upload own profile pictures");
    expect(sql).toContain("public.is_valid_profile_picture_object(bucket_id, name, metadata)");
    expect(sql).toContain("(storage.foldername(_name))[1] = auth.uid()::text");
  });

  it("records safe audit events without adding broad direct audit writes", () => {
    const sql = readProfilePictureMigrations();

    expect(sql).toContain("profile_picture_upload_audit");
    expect(sql).toContain("No direct profile picture audit writes");
    expect(sql).toContain("WITH CHECK (false)");
    expect(sql).toContain("log_profile_picture_upload_event");
  });
});