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
    formData: {},
  });
};

const registerPost = async (req, res) => {
  try {
    const { username, email, fname, lname, password, confirm_password } =
      req.body;

    const trimmedData = {
      username: username.trim(),
      email: email.trim(),
      fname: fname.trim(),
      lname: lname.trim(),
      password: password,
      confirm_password: confirm_password,
    };

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/;

    const errors = [];

    if (trimmedData.password !== trimmedData.confirm_password) {
      errors.push("Passwords do not match");
    }

    if (!passwordRegex.test(trimmedData.password)) {
      errors.push(
        "Password must be at least 10 characters with uppercase, lowercase, number, and symbol",
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedData.email)) {
      errors.push("Invalid email format");
    }

    if (errors.length > 0) {
      return res.render("register", {
        title: "Register",
        user: null,
        activePage: "register",
        error: errors.join(". "),
        formData: trimmedData,
      });
    }

    const existingUser = await User.findByUsername(trimmedData.username);
    if (existingUser) {
      return res.render("register", {
        title: "Register",
        user: null,
        activePage: "register",
        error: "Username already exists",
        formData: trimmedData,
      });
    }

    const existingEmail = await User.findByEmail(trimmedData.email);
    if (existingEmail) {
      return res.render("register", {
        title: "Register",
        user: null,
        activePage: "register",
        error: "Email already registered",
        formData: trimmedData,
      });
    }

    const user = await User.create({
      username: trimmedData.username,
      email: trimmedData.email,
      fname: trimmedData.fname,
      lname: trimmedData.lname,
      password: trimmedData.password,
    });

    req.session.user = {
      id: user.user_id,
      username: user.user_name,
    };

    res.redirect("/events");
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === "23505") {
      return res.render("register", {
        title: "Register",
        user: null,
        activePage: "register",
        error: "Username or email already exists",
        formData: {},
      });
    }

    res.render("register", {
      title: "Register",
      user: null,
      activePage: "register",
      error: "An error occurred. Please try again.",
      formData: {},
    });
  }
};

module.exports = { loginGet, loginPost, logout, registerGet, registerPost };
