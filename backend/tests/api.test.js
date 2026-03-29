import request from "supertest";

import { jest } from '@jest/globals';

jest.unstable_mockModule('firebase-admin', () => ({
  default: {
    auth: () => ({
      verifyIdToken: jest.fn().mockResolvedValue({
        uid: 'test-user-123',
        email: 'test@example.com',
        role: 'user'
      }),
    }),
    credential: {
      cert: jest.fn(),
    },
    initializeApp: jest.fn(),
  },
}));
const { default: app } = await import("../app.js");
describe("Basic API Tests", () => {
    it("GET /", async () => {
        const response = await request(app).get("/");
        expect(response.status).toBe(200);
        expect(response.text).toBe("API is running...");
    });

    it("GET /protected without token", async () => {
        const response = await request(app).get("/api/protected");
        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({ message: "Not authorized, no token" });
    });

    it("GET /protected with token", async () => {
        const response = await request(app).get("/api/protected").set("Authorization", "Bearer ABC-123-MOCK-TOKEN");
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ message: "Access granted to protected route" });
    });
});