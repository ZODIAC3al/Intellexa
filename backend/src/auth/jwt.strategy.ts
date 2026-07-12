import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<User>
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let token = null;
          if (request && request.cookies) {
            token = request.cookies['jwt_token'];
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'intellexa-secret-key-change-in-prod',
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.userModel.findById(payload.sub).select('-passwordHash');
    if (!user) {
      throw new UnauthorizedException('User not found or session invalid');
    }
    return user;
  }
}
