import { Router } from "express";

export function createHealthRouter({
    healthFunctions,
}) {
    const router = Router();

    router.get("/", healthFunctions.checkHealth);

    return router;
}
