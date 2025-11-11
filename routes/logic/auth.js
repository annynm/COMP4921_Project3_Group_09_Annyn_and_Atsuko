const User = require("../../models/User");

const loginGet = (req, res) => {
  if (req.session.user) {
    return res.redirect("/events");
  }
  res.render("login", {
    title: "Login",
    user: null,
    activePage: "login",
    error: null,
  });
};

const loginPost = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findByUsername(username);

    if (!user) {
      return res.render("login", {
        title: "Login",
        user: null,
        activePage: "login",
        error: "Invalid credentials",
      });
    }

    const isValidPassword = await User.verifyPassword(
      password,
      user.password_hash,
    );
    if (!isValidPassword) {
      return res.render("login", {
        title: "Login",
        user: null,
        activePage: "login",
        error: "Invalid credentials",
      });
    }

    req.session.user = {
      id: user.user_id,
      username: user.user_name,
      email: user.email,
      fname: user.fname,
      lname: user.lname,
    };

    res.redirect("/events");
  } catch (error) {
    console.error("Login error:", error);
    res.render("login", {
      title: "Login",
      user: null,
      activePage: "login",
      error: "An error occurred. Please try again.",
    });
  }
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Session destruction error:", err);
    res.redirect("/");
  });
};

const registerGet = (req, res) => {
  if (req.session.user) {
    return res.redirect("/events");
  }
  res.render("register", {
    title: "Register",
    user: null,
    activePage: "register",
    error: null,
  });
};

const registerPost = async (req, res) => {
  try {
    const { username, email, fname, lname, password, confirm_password } =
      req.body;

    // Trim whitespace
    const trimmedData = {
      username: username.trim(),
      email: email.trim(),
      fname: fname.trim(),
      lname: lname.trim(),
      password: password,
      confirm_password: confirm_password,
    };

    // Validate passwords match
    if (trimmedData.password !== trimmedData.confirm_password) {
      return res.render("register", {
        title: "Register",
        user: null,
        activePage: "register",
        error: "Passwords do not match",
      });
    }

    // Validate password strength (minimum 8 characters)
    if (trimmedData.password.length < 8) {
      return res.render("register", {
        title: "Register",
        user: null,
        activePage: "register",
        error: "Password must be at least 8 characters",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedData.email)) {
      return res.render("register", {
        title: "Register",
        user: null,
        activePage: "register",
        error: "Invalid email format",
      });
    }

    // Check if user already exists
    const existingUser = await User.findByUsername(trimmedData.username);
    if (existingUser) {
      return res.render("register", {
        title: "Register",
        user: null,
        activePage: "register",
        error: "Username already exists",
      });
    }

    // Check if email already registered
    const existingEmail = await User.findByEmail(trimmedData.email);
    if (existingEmail) {
      return res.render("register", {
        title: "Register",
        user: null,
        activePage: "register",
        error: "Email already registered",
      });
    }

    // Create user
    const user = await User.create({
      username: trimmedData.username,
      email: trimmedData.email,
      fname: trimmedData.fname,
      lname: trimmedData.lname,
      password: trimmedData.password,
    });

    // Auto-login
    req.session.user = {
      id: user.user_id,
      username: user.user_name,
      email: user.email,
      fname: user.fname,
      lname: user.lname,
    };

    res.redirect("/events");
  } catch (error) {
    console.error("Registration error:", error);
    res.render("register", {
      title: "Register",
      user: null,
      activePage: "register",
      error: "An error occurred. Please try again.",
    });
  }
};

module.exports = { loginGet, loginPost, logout, registerGet, registerPost };
