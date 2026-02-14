// Auth module — user registration and login
const bcrypt = require('bcryptjs')

module.exports = function (helpers) {
    const { runQuery, runQueryOne, runExec } = helpers

    function registerUser({ username, email, password }) {
        try {
            const existingUser = runQueryOne('SELECT id FROM users WHERE email = ? OR username = ?', [email, username])
            if (existingUser) {
                return { success: false, error: 'Bu e-posta veya kullanıcı adı zaten kullanılıyor' }
            }

            const passwordHash = bcrypt.hashSync(password, 10)
            const info = runExec('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, passwordHash])

            return {
                success: true,
                user: { id: info.lastInsertRowid, username, email }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function loginUser({ email, password }) {
        try {
            const user = runQueryOne('SELECT * FROM users WHERE email = ?', [email])
            if (!user) {
                return { success: false, error: 'E-posta veya şifre hatalı' }
            }

            const isValid = bcrypt.compareSync(password, user.password_hash)
            if (!isValid) {
                return { success: false, error: 'E-posta veya şifre hatalı' }
            }

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    mustChangePassword: !!user.must_change_password
                }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function changePassword({ userId, newPassword }) {
        try {
            const passwordHash = bcrypt.hashSync(newPassword, 10)
            runExec('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [passwordHash, userId])
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function getUserPasswordHash(userId) {
        try {
            const user = runQueryOne('SELECT password_hash FROM users WHERE id = ?', [userId])
            return user ? user.password_hash : null
        } catch (error) {
            console.error('getUserPasswordHash error:', error)
            return null
        }
    }

    return { registerUser, loginUser, changePassword, getUserPasswordHash }
}
