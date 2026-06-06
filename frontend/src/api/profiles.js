// profiles.js
import { apiGet } from "./api"
import { apiPost } from "./api"
import { apiPut } from "./api"

export async function getProfiles() {
    return apiGet("/api/profiles/")
}

export async function getPerformance(profileId) {
    return apiGet(`/api/profiles/${profileId}/performance`)
}

export async function getProfile(profileId) {
    return apiGet(`/api/profiles/${profileId}`)
}

export async function getProfileHistory(profileId) {
    return apiGet(`/api/profiles/${profileId}/history`)
}

export async function createProfile(name) {
    return apiPost(`/api/profiles?name=${encodeURIComponent(name)}`, {})
}

export async function editProfile(profileId, newName) {
    return apiPut(`/api/profiles/${profileId}/edit?new_name=${encodeURIComponent(newName)}`)
}
