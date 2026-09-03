import { Body, Controller, Post } from "@nestjs/common";
import { AuthorizationService } from "./authorization.service";
import { AuthorizeDto } from "./dto/authorize.dto";


@Controller("authorization")
export class AuthorizationController {

constructor(
 private readonly authorizationService: AuthorizationService
){}


@Post("rfid")
authorize(
 @Body() dto: AuthorizeDto
){
 return this.authorizationService.authorize(
   dto.identifier
 );
}

}
