const authService = require('../services/authService');
const path = require('path');

exports.register = async (req, res) => {
  try {
    const { full_name, email, username, password } = req.body;
    let profilePicPath = null;
    if (req.file) {
      profilePicPath = path.join('uploads/profile_pics', req.file.filename);
    }

    // Call service to handle registration
    const { user, error, status } = await authService.registerUser(
      full_name,
      email,
      username,
      password,
      profilePicPath
    );

    if (error) {
      return res.status(status).json({ message: error });
    }

    return res.status(201).json({ // 201 Created
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        profile_pic_path: user.profile_pic_path
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.sendVerificationCode = async (req, res) => {
  try {
    let resp = await authService.sendVerificationCode(req.body.email);
    if (resp.error) {
      return res.status(resp.status).json({ message: resp.error });
    }

    return res.status(200).json({ message: 'Verification code sent successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.confirmEmail = async (req, res) => {
  try {
    let resp = await authService.confirmEmail(req.body.email, req.body.verification_code);
    if (resp.error) {
      return res.status(resp.status).json({ message: resp.error });
    }

    return res.status(200).json({ message: resp.message });
  } catch(err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const deviceIdHeader = req.headers['x-device-id'];

    let resp = await authService.loginUser(email, password, deviceIdHeader);

    if (resp.error) {
      return res.status(resp.status).json({ message: resp.error });
    }

    return res.status(200).json({
      message: "User logged in successfully",
      access_token: resp.access_token,
      refresh_token: resp.refresh_token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}