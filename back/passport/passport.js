import passport from 'passport'
import passportLocal from 'passport-local'
import passportJWT from 'passport-jwt'
import bcrypt from 'bcrypt'
import User from '../models/user.js'

passport.use('login', new passportLocal.Strategy({
  // 檢查有無這兩個欄位
  usernameField: 'account',
  passwordField: 'password'
}, async (account, password, done) => {
  // 有的話再執行這個function
  try {
    const user = await User.findOne({ account }) // await要記得加
    if (!user) {
      throw new Error('ACCOUNT')
    }
    if (!bcrypt.compareSync(password, user.password)) {
      throw new Error('PASSWORD')
    }
    return done(null, user, null)
  } catch (error) {
    console.log(error)
    if (error.message === 'ACCOUNT') {
      return done(null, null, { message: '使用者帳號不存在' })
    } else if (error.message === 'PASSWORD') {
      return done(null, null, { message: '使用者密碼錯誤' })
    } else {
      return done(null, null, { message: '未知錯誤' })
    }
  }
}))

passport.use('jwt', new passportJWT.Strategy({
  jwtFromRequest: passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
  passReqToCallback: true,
  // 忽略過期的檢查
  ignoreExpiration: true
}, async (req, payload, done) => {
  try {
    // exp表示過期的時間
    const expired = payload.exp * 1000 < new Date().getTime()

    /*
      如果網址為http://localhost:4000/user/test?aaa=111&bbb=222
      則
      req.originUrl = /user/test?aaa=111&bbb=222
      req.baseUrl = /user
      req.path = /test
      req.query = { aaa: 111, bbb: 222 }
    */

    const url = req.baseUrl + req.path
    // 如果過期了且網址不是舊換新也不是登出
    if (expired && url !== '/user/extend' && url !== '/user/logout') {
      throw new Error('EXPIRED')
    }

    // 把 JWT 取出來
    const token = passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken()(req)
    // 找使用者是否有人符合這個ID
    const user = await User.findOne({ _id: payload._id, tokens: token })
    if (!user) {
      throw new Error('JWT')
    }

    return done(null, { user, token }, null)
  } catch (error) {
    console.log(error)
    if (error.message === 'EXPIRED') {
      return done(null, null, { message: '登入過期' })
    } else if (error.message === 'JWT') {
      return done(null, null, { message: '登入無效' })
    } else {
      return done(null, null, { message: '未知錯誤' })
    }
  }
}))
