"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../users/users.service");
const bcrypt = __importStar(require("bcrypt"));
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    constructor(users, jwt, cfg, prisma) {
        this.users = users;
        this.jwt = jwt;
        this.cfg = cfg;
        this.prisma = prisma;
    }
    async validateUser(username, pass) {
        // const user = await this.users.findByEmail(email);
        const user = await this.users.findByUserName(username);
        if (!user || !user.password)
            return null;
        const ok = await bcrypt.compare(pass, user.password);
        if (!ok)
            return null;
        return { id: user.id, name: user.name, lastname: user.lastname, role: user.role, health_benefits: user.health_benefits };
    }
    signAccessToken(payload) {
        return this.jwt.signAsync(payload, {
            secret: this.cfg.get('JWT_ACCESS_SECRET'),
            expiresIn: this.cfg.get('JWT_ACCESS_EXPIRES') || '15m',
        });
    }
    async issueRefreshToken(userId) {
        const expiresIn = this.cfg.get('JWT_REFRESH_EXPIRES') || '7d';
        const token = await this.jwt.signAsync({ sub: userId }, {
            secret: this.cfg.get('JWT_REFRESH_SECRET'),
            expiresIn,
        });
        // store hashed token for rotation/revocation
        const hashed = await bcrypt.hash(token, 12);
        const expiresAt = new Date(Date.now() + this.parseMs(expiresIn));
        // await this.prisma.refreshToken.create({ data: { userId, hashed, expiresAt }});
        const id = require('crypto').randomUUID();
        await this.prisma.refresh_token.upsert({
            where: { userId: userId },
            update: { hashed, expiresAt, revoked: false },
            create: { userId, hashed, expiresAt, revoked: false },
        });
        return token;
    }
    parseMs(span) {
        // tiny parser: 15m, 7d, 24h
        const m = span.match(/^(\d+)([smhd])$/);
        if (!m)
            return 0;
        const n = Number(m[1]);
        const unit = m[2];
        const mult = unit === 's' ? 1000 : unit === 'm' ? 60000 : unit === 'h' ? 3600000 : 86400000;
        return n * mult;
    }
    async register(dto) {
        if (dto.password !== dto.confirmPassword) {
            throw new common_1.BadRequestException('Passwords do not match');
        }
        const user = await this.users.create(dto);
        const tokens = await this.loginById(user.id, 'patient');
        return { user, ...tokens };
    }
    async login(username, password) {
        const valid = await this.validateUser(username, password);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (valid.role == null)
            throw new common_1.UnauthorizedException('Invalid role');
        const tokens = await this.loginById(valid.id, valid.role);
        return { user: valid, ...tokens };
    }
    async loginById(id, role) {
        const access_token = await this.signAccessToken({ sub: id, role: role });
        const refresh_token = await this.issueRefreshToken(id);
        return { access_token, refresh_token };
    }
    async refresh(userId, incomingToken) {
        // verify signature first
        await this.jwt.verifyAsync(incomingToken, { secret: this.cfg.get('JWT_REFRESH_SECRET') });
        // check it exists (and not revoked)
        const tokens = await this.prisma.refresh_token.findMany({ where: { userId, revoked: false } });
        const match = await Promise.any(tokens.map(t => bcrypt.compare(incomingToken, t.hashed)))
            .catch(() => false);
        if (!match)
            throw new common_1.UnauthorizedException('Refresh token invalid');
        // rotate: revoke all old tokens for simplicity
        await this.prisma.refresh_token.updateMany({ where: { userId }, data: { revoked: true } });
        const user = await this.users.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const access_token = await this.signAccessToken({ sub: user.id, role: user.role || "" });
        const refresh_token = await this.issueRefreshToken(user.id);
        return { access_token, refresh_token };
    }
    async logout(userId) {
        await this.prisma.refresh_token.updateMany({ where: { userId }, data: { revoked: true } });
        return { ok: true };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        prisma_service_1.PrismaService])
], AuthService);
