import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Request, Response } from 'express';
import { AttachRefreshTokenToHeader } from './utils/token.helper';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private jwt: JwtService,
    private cfg: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({passthrough: true}) res:Response) {
    // console.log('DTO plain:', dto);
    const {user, access_token, refresh_token } = await this.auth.register(dto);
    
    AttachRefreshTokenToHeader(refresh_token, res);

    return {user, access_token};
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    // get user, access token, refresh token data    
    const {user, access_token, refresh_token } = await this.auth.login(dto.username, dto.password);
    
    // attack refresh token to response heaeder
    AttachRefreshTokenToHeader(refresh_token, res);

    return {user, access_token};
  }

  @Get('whoami')
  @UseGuards(JwtAuthGuard)
  async whoami(@Req() req: Request) {
    // console.log('whoami req.user:', util.inspect(req.user, { depth: null }));
    if (!req.user || !req.user.sub) throw new UnauthorizedException();
    const data = await this.auth.getMe(req.user.sub);
    return data;
  }

  // @Post('refresh')
  // async refresh(@Body() body: { refresh_token: string }) {
  //   const payload = await this.jwt.verifyAsync(body.refresh_token, {
  //     secret: this.cfg.get('JWT_REFRESH_SECRET'),
  //     ignoreExpiration: true,
  //   });

  //   return this.auth.refresh(payload.sub, body.refresh_token);
  // }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refresh_token = req.cookies.refresh_token;
    if (!refresh_token)
      throw new UnauthorizedException('Missing refresh_token cookie');

    // validate refresh_token
    const payload = await this.jwt.verifyAsync(refresh_token, {
      secret: this.cfg.get('JWT_REFRESH_SECRET'),
      ignoreExpiration: false,
    });

    // generate new access token, refresh token
    const user_id = payload.sub;
    const { access_token: new_access_token, refresh_token: new_refresh_token } =
      await this.auth.refresh(user_id, refresh_token);

    // insert refresh_token in the response
    AttachRefreshTokenToHeader(new_refresh_token, res);
    return { new_access_token };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: any) {
    return this.auth.logout(req.user.sub);
  }
}
