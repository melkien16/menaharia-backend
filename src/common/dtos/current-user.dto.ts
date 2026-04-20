export class CurrentUserDto {
  id: string;
  email?: string | null;
  phone?: string;
  fullName?: string;
  roles: string[];
  refreshTokenId?: string;
}
