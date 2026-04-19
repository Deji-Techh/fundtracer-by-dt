/**
 * FundTracer Referral System
 * Code-based referral: generates unique short codes, handles referrals with Firestore + Redis caching
 */

import { getFirestore } from '../firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { getRedis, cacheGet, cacheSet, cacheDel } from './redis.js';
import { torqueService } from '../services/TorqueService.js';

const REFERRAL_CODE_PREFIX = 'FUND';
const REFERRAL_CODE_LENGTH = 6;
const REFERRAL_CACHE_TTL = 3600; // 1 hour

function generateReferralCode(userId: string, index: number = 0): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = REFERRAL_CODE_PREFIX;
    
    const userHash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seed = userHash + index;
    
    for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
        code += chars[(seed * (i + 1) * 7) % chars.length];
    }
    
    return code;
}

export function generateUniqueReferralCode(userId: string, index: number = 0): string {
    if (index > 100) {
        return generateReferralCode(userId, 0) + Date.now().toString(36).toUpperCase();
    }
    const code = generateReferralCode(userId, index);
    return code;
}

export async function createReferralCode(userId: string): Promise<string> {
    const db = getFirestore();
    const code = generateUniqueReferralCode(userId);
    
    await db.collection('referral_codes').doc(code).set({
        userId,
        code,
        createdAt: new Date(),
        usedCount: 0,
        active: true
    });
    
    return code;
}

export async function getReferralCodeOwner(code: string): Promise<string | null> {
    if (!code || !code.startsWith(REFERRAL_CODE_PREFIX)) {
        return null;
    }
    
    const redis = getRedis();
    const cacheKey = `ref_code:${code}`;
    
    if (redis) {
        try {
            const cached = await cacheGet<string>(cacheKey);
            if (cached) return cached;
        } catch (e) {
            console.log('[Referral] Cache read error:', e);
        }
    }
    
    const db = getFirestore();
    const codeDoc = await db.collection('referral_codes').doc(code).get();
    
    if (!codeDoc.exists) {
        return null;
    }
    
    const data = codeDoc.data();
    if (!data?.active) {
        return null;
    }
    
    const userId = data.userId;
    
    if (redis) {
        try {
            await cacheSet(cacheKey, userId, REFERRAL_CACHE_TTL);
        } catch (e) {
            console.log('[Referral] Cache write error:', e);
        }
    }
    
    return userId;
}

export async function processReferral(referrerId: string, refereeId: string): Promise<boolean> {
    const db = getFirestore();
    
    const referrerRef = db.collection('users').doc(referrerId);
    const referrerDoc = await referrerRef.get();
    
    if (!referrerDoc.exists) {
        console.log('[Referral] Referrer not found:', referrerId);
        return false;
    }
    
    const refereeRef = db.collection('users').doc(refereeId);
    const refereeDoc = await refereeRef.get();
    
    if (refereeDoc.exists) {
        const existingReferredBy = refereeDoc.data()?.referredBy;
        if (existingReferredBy) {
            console.log('[Referral] User already referred by:', existingReferredBy);
            return false;
        }
    }
    
    await referrerRef.update({
        referralCount: FieldValue.increment(1),
        referredUsers: FieldValue.arrayUnion(refereeId)
    });
    
    await torqueService.creditReferralBonus(referrerId, refereeId);
    
    await refereeRef.update({ referredBy: referrerId });
    
    await updateReferralCodeUsage(referrerId);
    
    console.log('[Referral] Referral credited:', referrerId, 'referred', refereeId);
    return true;
}

async function updateReferralCodeUsage(referrerId: string): Promise<void> {
    const db = getFirestore();
    
    const userDoc = await db.collection('users').doc(referrerId).get();
    const userData = userDoc.data();
    const code = userData?.referralCode;
    
    if (!code) return;
    
    const codeRef = db.collection('referral_codes').doc(code);
    const codeDoc = await codeRef.get();
    
    if (codeDoc.exists) {
        await codeRef.update({
            usedCount: FieldValue.increment(1)
        });
    }
}

export async function getUserReferralCode(userId: string): Promise<string | null> {
    const db = getFirestore();
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        return null;
    }
    
    const data = userDoc.data();
    return data?.referralCode || null;
}

export async function ensureUserHasReferralCode(userId: string): Promise<string> {
    const existingCode = await getUserReferralCode(userId);
    if (existingCode) {
        return existingCode;
    }
    
    const newCode = await createReferralCode(userId);
    
    const db = getFirestore();
    await db.collection('users').doc(userId).update({
        referralCode: newCode
    });
    
    return newCode;
}

export async function invalidateReferralCache(code: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    
    const cacheKey = `ref_code:${code}`;
    try {
        await cacheDel(cacheKey);
    } catch (e) {
        console.log('[Referral] Cache invalidation error:', e);
    }
}