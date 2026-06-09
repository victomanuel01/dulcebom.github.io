package com.dulcebom.controller;

import com.dulcebom.model.Usuario;
import com.dulcebom.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class RegistroController {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public RegistroController(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/registro/guardar")
    public ResponseEntity<Map<String, Object>> guardar(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String name  = body.get("name");
        String pass  = body.get("password");

        // Verificar si el email ya existe
        if (usuarioRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.ok(Map.of("success", false, "message", "El email ya está registrado."));
        }

        Usuario u = new Usuario();
        u.setNombre(name);
        u.setEmail(email);
        u.setPassword(passwordEncoder.encode(pass));
        usuarioRepository.save(u);

        return ResponseEntity.ok(Map.of("success", true));
    }
}