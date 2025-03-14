import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Request, Response, Headers, Next, HttpStatus } from '@nestjs/common'
import dayjs from 'dayjs'
import * as Express from 'express'
import { Permission } from 'src/resource/database/entity/Permission.entity'
import { Gender, User, UserStatus } from 'src/resource/database/entity/User.entity'
import { getDatabaseClient } from 'src/resource/database/main'
import { Exception } from 'src/resource/plugin/error.plugin'
import tokenPlugin from 'src/resource/plugin/token.plugin'
import userPlugin from 'src/resource/plugin/user.plugin'
import utilityPlugin from 'src/resource/plugin/utility.plugin'
import CryptoJS from 'crypto-js'

@Controller()
export class UserController {
  constructor (
  ) {  }


  @Post('v0/signin')
  async signin (@Request() _request: Express.Request, @Body() _body: { type: 'authorization_code', code: string, state: string } | { type: 'token', token: string }, @Response() _response: Express.Response, @Headers('authorization') _authorization: string, @Next() _next: Express.NextFunction) {
    try {
      const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
      if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))
      if(typeof _sessionToken.userId == 'string') return _next(new Exception(_request, 'Already authorized.', HttpStatus.BAD_REQUEST))

      let _accessToken: { tokenType: 'Bearer' | 'Basic', accessToken: string & { __brand: 'TOKEN' }, refreshToken: string & { __brand: 'TOKEN' } } | null = null
      switch (_body.type) {
        case 'authorization_code':
          try {
            const _state: { provider: string, code_verifier: string, redirect_uri: string } = JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(_body.state)))
            if(_state.provider !== 'luna_accounts') return _next(new Exception(_request, 'Wrong provider.', HttpStatus.BAD_REQUEST))
            const _result = await tokenPlugin.Authorization.issueToken({ type: 'code', code: _body.code, redirectUri: _state.redirect_uri, codeVerifier: _state.code_verifier })
            if(_result.success !== true) return _next(new Exception(_request, 'Failed to issue access token.', HttpStatus.INTERNAL_SERVER_ERROR, _result.error))

            _accessToken = { tokenType: _result.token.tokenType, accessToken: _result.token.accessToken, refreshToken: _result.token.refreshToken }
          } catch (_error) { return _next(new Exception(_request, 'Failed to parse authorization code.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
          break
        case 'token':
          try {
            const _result = await tokenPlugin.Authorization.issueToken({ type: 'token', token: _body.token })
            if(_result.success !== true) return _next(new Exception(_request, 'Failed to issue access token.', HttpStatus.INTERNAL_SERVER_ERROR, _result.error))

            _accessToken = { tokenType: _result.token.tokenType, accessToken: _result.token.accessToken, refreshToken: _result.token.refreshToken }
          } catch (_error) { return _next(new Exception(_request, 'Failed to parse access token.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
          break
      }
      
      const _userinfo = await userPlugin.oAuth.getUser({ tokenType: _accessToken.tokenType, accessToken: _accessToken.accessToken })
      if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.FORBIDDEN, _userinfo.error))

      const _users = await getDatabaseClient().manager.getRepository(User).find({ where: { related_id: _userinfo.id, is_active: true } })
      if(_users.length !== 1) {
        const _temporaryToken = await tokenPlugin.Temporary.createToken({ ... _accessToken, session: _sessionToken.id })
        if(_temporaryToken.success == false) return _next(new Exception(_request, 'Failed to issue signup token.', HttpStatus.INTERNAL_SERVER_ERROR, _temporaryToken.error))
        _response.setHeader('Access-Control-Expose-Headers', 'X-Signup-Token, X-Request-Data')
        _response.setHeader('X-Signup-Token', `${ _temporaryToken.tokenType } ${ _temporaryToken.token }`)

        if(_userinfo.emailAddress == null) _response.setHeader('X-Request-Data', CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify([
          { name: { ko: '이메일 주소', en: 'Email Address' }, code: 'email_address' }
        ]))))
        return _next(new Exception(_request, 'Registration is required.', HttpStatus.FORBIDDEN))
      }

      if(_users[0].status !== UserStatus.Normal) {
        switch (_users[0].status) {
          case UserStatus.Pending:
            return _next(new Exception(_request, 'Pending approval.', HttpStatus.UNAUTHORIZED))
          case UserStatus.Suspended:
            return _next(new Exception(_request, 'Suspended.', HttpStatus.FORBIDDEN))
        }
      }
      const _result = await _sessionToken.signin(_users[0].uuid)
      if(_result.success == false) return _next(new Exception(_request, 'Failed to modify token.', HttpStatus.INTERNAL_SERVER_ERROR, _result.error))

      return _response.status(200).json({ success: true, data: null, error: null, requested_at: new Date().toISOString() })
    } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
  }

  @Post('v0/signup')
  async signup (@Request() _request: Express.Request, @Body() _body: { signup_token: string, data: { [ key in string ]: string } }, @Response() _response: Express.Response, @Headers('authorization') _authorization: string, @Next() _next: Express.NextFunction) {
    try {
      const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
      if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))
      if(typeof _sessionToken.userId == 'string') return _next(new Exception(_request, 'Already signed up.', HttpStatus.BAD_REQUEST))

      const _signupToken = await tokenPlugin.Temporary.getSummary(utilityPlugin.tokenParser(_body.signup_token))
      if(_signupToken.success == false) return _next(new Exception(_request, 'Failed to fetch signup token.', HttpStatus.BAD_REQUEST, _signupToken.error))

      const _accessToken = _signupToken.data as { tokenType: 'Bearer' | 'Basic', accessToken: string & { __brand: 'TOKEN' }, refreshToken: string & { __brand: 'TOKEN' }, session: string & { __brand: 'UUID' } }
      const _userinfo = await userPlugin.oAuth.getUser(_accessToken)
      if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.BAD_REQUEST, _userinfo.error))
      
      if(typeof _userinfo.emailAddress !== 'string') {
        if(typeof _body.data.email_address !== 'string') return _next(new Exception(_request, 'Email address is required.', HttpStatus.BAD_REQUEST, new Error('Email address is required.')))
      }

      const _permissions = await getDatabaseClient().manager.getRepository(Permission).find({ where: { is_default: true, is_active: true } })
    
      console.log(_userinfo)

      const _User = new User()
      _User.related_id = _userinfo.id
      _User.username = _userinfo.username
      _User.full_name = _userinfo.name
      _User.birthday = dayjs(_userinfo.birthdate).format('YYYY-MM-DD')
      _User.gender = _userinfo.gender == 'male' ? Gender.Male : Gender.Female
      _User.email_address = typeof _userinfo.emailAddress == 'string' ? _userinfo.emailAddress : _body.data.email_address
      _User.phone_number = _userinfo.phoneNumber
      _User.profile_image = _userinfo.image ?? null
      _User.permission = _permissions.map(_permission => _permission.uuid)

      const _user = await getDatabaseClient().manager.save(_User)
      if(_user.status == UserStatus.Normal) {
        const _result = await _sessionToken.signin(_user.uuid)
        if(_result.success == false) return _next(new Exception(_request, 'Failed to sign in.', HttpStatus.INTERNAL_SERVER_ERROR, _result.error))
      }

      return _response.status(200).json({ success: true, data: null, error: null, requested_at: new Date().toISOString() })
    } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
  }
  
  @Get('v0/userinfo')
  async userinfo (@Request() _request: Express.Request, @Response() _response: Express.Response, @Headers('authorization') _authorization: string, @Next() _next: Express.NextFunction) {
    try {
      const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
      if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

      if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))

      const _userinfo = await userPlugin.User.search(_sessionToken.userId)
      if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

      return _response.status(200).json({ success: true, data: {
        id: _userinfo.id,

        full_name: _userinfo.fullName,
        username: _userinfo.username,

        phone_number: _userinfo.phoneNumber,
        email_address: _userinfo.emailAddress,

        image: _userinfo.image
      }, error: null, requested_at: new Date().toISOString() })
    } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
  }
}
