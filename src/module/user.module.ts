import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
import { UserController } from 'src/controller/user.controller'
import internalAuthorizedMiddleware from 'src/middleware/internal.authorized.middleware'
import internalMiddleware from 'src/middleware/internal.middleware'
import { EntityManager } from 'typeorm'

@Module({
    imports: [  ],
    controllers: [ UserController ],
    providers: [  ],
})

export class UserModule implements NestModule {
    configure(_consumer: MiddlewareConsumer) {
        _consumer
            .apply(internalAuthorizedMiddleware)
            .exclude(
                { path: 'v0/signin', method: RequestMethod.POST },
                { path: 'v0/signup', method: RequestMethod.POST }
            )
            .forRoutes(UserController)
        _consumer
            .apply(internalMiddleware)
            .forRoutes(
                { path: 'v0/signin', method: RequestMethod.POST },
                { path: 'v0/signup', method: RequestMethod.POST }
            )
    }
}