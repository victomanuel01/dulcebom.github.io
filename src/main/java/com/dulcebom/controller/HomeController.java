package com.dulcebom.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping("/login")
    public String login() { return "login"; }

    @GetMapping({"/" , "/home"})
    public String home() { return "home"; }

    @GetMapping("/registro")
    public String registro() { return "registro"; }

    // /recuperar lo maneja RecuperarController
    // /recuperar/nueva-contrasena también
}
