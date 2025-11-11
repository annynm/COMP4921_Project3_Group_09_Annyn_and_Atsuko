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
    formData: {},
  });
};

const registerPost = async (req, res) => {
  try {
    const { username, email, fname, lname, password, confirm_password } =
      req.body;

    // Trim whitespace from inputs
    const trimmedData = {
      username: username.trim(),
      email: email.trim(),
      fname: fname.trim(),
      lname: lname.trim(),
      password: password,
      confirm_password: confirm_password,
    };

    // --- PASSWORD VALIDATION (Meets Project Criteria) ---
    // Must be: >=10 chars, uppercase, lowercase, number, symbol
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/;

    // Collect all validation errors
    const errors = [];

    if (trimmedData.password !== trimmedData.confirm_password) {
      errors.push("Passwords do not match");
    }

    if (!passwordRegex.test(trimmedData.password)) {
      errors.push(
        "Password must be at least 10 characters with uppercase, lowercase, number, and symbol",
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedData.email)) {
      errors.push("Invalid email format");
    }

    // If any errors, re-render form with error messages and preserved data
    if (errors.length > 0) {
      return res.render("register", {
        title: "Register",
        user: null,
        activePage: "register",
        error: errors.join(". "), // Join multiple errors for display
        formData: trimmedData, // Preserve user input
      });
    }

    // Check username availability
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

    // Check email availability
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

    // All validations passed - create user with hashed password
    const user = await User.create({
      username: trimmedData.username,
      email: trimmedData.email,
      fname: trimmedData.fname,
      lname: trimmedData.lname,
      password: trimmedData.password,
    });

    // Auto-login after successful registration
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

    // Handle database unique constraint violations (backup validation)
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
