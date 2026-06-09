package com.dulcebom.service;

import com.dulcebom.model.*;
import com.dulcebom.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.Map;

@Service
public class CrudService {

    @Autowired private ClienteRepository clienteRepo;
    @Autowired private ProductoRepository productoRepo;
    @Autowired private PedidoRepository pedidoRepo;
    @Autowired private AuditoriaRepository auditoriaRepo;

    public ResponseEntity<?> saveClient(Map<String, Object> d) {
        String name = (String) d.getOrDefault("name", "");
        if (name.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "El nombre es obligatorio."));

        Cliente c = d.containsKey("id") && d.get("id") != null
                ? clienteRepo.findById(Long.valueOf(d.get("id").toString())).orElse(new Cliente())
                : new Cliente();

        c.setNombre(name);
        c.setEmail((String) d.getOrDefault("email", ""));
        c.setTelefono((String) d.getOrDefault("phone", ""));
        c.setDireccion((String) d.getOrDefault("address", ""));
        clienteRepo.save(c);
        log("Sistema", "Guardar", "Cliente", "Nombre: " + name);
        return ResponseEntity.ok(Map.of("success", true, "message", "Cliente guardado correctamente."));
    }

    public ResponseEntity<?> saveProduct(Map<String, Object> d, MultipartFile imagen) {
        String nombre = (String) d.getOrDefault("nombre", "");
        if (nombre.isEmpty())
            return ResponseEntity.ok(Map.of("success", false, "message", "Falta nombre"));

        Producto p = d.containsKey("id") && d.get("id") != null
                ? productoRepo.findById(Long.valueOf(d.get("id").toString())).orElse(new Producto())
                : new Producto();

        p.setNombre(nombre);
        p.setDescripcion((String) d.getOrDefault("descripcion", ""));
        p.setPrecioBase(Double.valueOf(d.getOrDefault("precio_base", 0).toString()));

        if (imagen != null && !imagen.isEmpty()) {
            try {
                String uploadDir = "src/main/resources/static/assets/uploaded_products/";
                Files.createDirectories(Paths.get(uploadDir));
                String fileName = "torta_" + Long.toHexString(System.currentTimeMillis()) + ".jpg";
                Path dest = Paths.get(uploadDir + fileName);
                Files.write(dest, imagen.getBytes());
                p.setImagenUrl("assets/uploaded_products/" + fileName);
            } catch (Exception e) {
                p.setImagenUrl("assets/imagen.jpg");
            }
        } else if (p.getImagenUrl() == null) {
            p.setImagenUrl("assets/imagen.jpg");
        }

        productoRepo.save(p);
        log("Sistema", "Guardar", "Producto", "Nombre: " + nombre);
        return ResponseEntity.ok(Map.of("success", true, "message", "Catálogo actualizado"));
    }

    public ResponseEntity<?> deleteProduct(Map<String, Object> d) {
        try {
            productoRepo.deleteById(Long.valueOf(d.get("id").toString()));
            log("Sistema", "Eliminar", "Producto", "ID: " + d.get("id"));
            return ResponseEntity.ok(Map.of("success", true, "message", "Producto eliminado"));
        } catch (Exception e) {
            return ResponseEntity.status(409).body(Map.of("success", false, "message", "No se puede eliminar, está en uso"));
        }
    }

    @SuppressWarnings("unchecked")
    public ResponseEntity<?> saveOrder(Map<String, Object> d) {
        try {
            String fechaStr = (String) d.get("deliveryDate");
            if (fechaStr == null)
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "La fecha de entrega es obligatoria."));

            LocalDate fechaEntrega = LocalDate.parse(fechaStr);
            if (fechaEntrega.isBefore(LocalDate.now()))
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "La fecha no puede ser anterior a hoy."));

            Pedido p = d.containsKey("id") && d.get("id") != null
                    ? pedidoRepo.findById(Long.valueOf(d.get("id").toString())).orElse(new Pedido())
                    : new Pedido();

            Map<String, Object> client = (Map<String, Object>) d.get("client");
            p.setIdCliente(Long.valueOf(client.get("id").toString()));
            p.setIdProducto(d.get("id_producto") != null ? Long.valueOf(d.get("id_producto").toString()) : null);
            p.setRucCliente((String) d.getOrDefault("ruc", null));
            p.setDetalles((String) d.getOrDefault("orderNotes", ""));
            p.setMonto(Double.valueOf(d.getOrDefault("amount", 0).toString()));
            p.setDescuento(Integer.valueOf(d.getOrDefault("discount", 0).toString()));
            p.setMontoFinal(Double.valueOf(d.getOrDefault("finalAmount", 0).toString()));
            p.setFechaEntrega(fechaEntrega);
            p.setMensajeRecibo((String) d.getOrDefault("receiptMessage", ""));
            p.setTipoComprobante((String) d.getOrDefault("docType", "boleta"));
            if (p.getEstado() == null) p.setEstado("pending");

            pedidoRepo.save(p);
            log("Sistema", "Guardar", "Pedido", "Monto: " + p.getMontoFinal());
            return ResponseEntity.ok(Map.of("success", true, "message", "Pedido guardado"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "message", "Error: " + e.getMessage()));
        }
    }

    public ResponseEntity<?> deleteOrder(Map<String, Object> d) {
        pedidoRepo.deleteById(Long.valueOf(d.get("id").toString()));
        log("Sistema", "Eliminar", "Pedido", "ID: " + d.get("id"));
        return ResponseEntity.ok(Map.of("success", true, "message", "Eliminado"));
    }

    public ResponseEntity<?> toggleOrderStatus(Map<String, Object> d) {
        pedidoRepo.findById(Long.valueOf(d.get("id").toString())).ifPresent(p -> {
            p.setEstado((String) d.get("newStatus"));
            pedidoRepo.save(p);
        });
        log("Sistema", "Cambio Estado", "Pedido", "ID: " + d.get("id"));
        return ResponseEntity.ok(Map.of("success", true));
    }

    public ResponseEntity<?> saveCustomMessage(Map<String, Object> d) {
        pedidoRepo.findById(Long.valueOf(d.get("id").toString())).ifPresent(p -> {
            p.setMensajeRecibo((String) d.get("message"));
            pedidoRepo.save(p);
        });
        return ResponseEntity.ok(Map.of("success", true, "message", "Guardado"));
    }

    private void log(String usuario, String accion, String entidad, String detalles) {
        Auditoria a = new Auditoria();
        a.setUsuario(usuario); a.setAccion(accion);
        a.setEntidad(entidad); a.setDetalles(detalles);
        auditoriaRepo.save(a);
    }
}
