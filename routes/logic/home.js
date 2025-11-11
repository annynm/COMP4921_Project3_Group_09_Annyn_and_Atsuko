const homeLogic = (req, res) => {
  res.render("index", {
    title: "Welcome to Greendale",
    user: req.session.user,
    activePage: "home",
  });
};

module.exports = { homeLogic };
