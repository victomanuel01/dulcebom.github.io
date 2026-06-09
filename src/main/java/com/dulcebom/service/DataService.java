package com.dulcebom.service;

import com.dulcebom.model.Auditoria;
import com.dulcebom.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class DataService {

    @Autowired private ClienteRepository clienteRepo;
    @Autowired private ProductoRepository productoRepo;
    @Autowired private PedidoRepository pedidoRepo;
    @Autowired private AuditoriaRepository auditoriaRepo;

    public ResponseEntity<?> loadAllData() {
        List<Map<String, Object>> clients = clienteRepo.findAll().stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.getId()); m.put("name", c.getNombre());
            m.put("email", c.getEmail()); m.put("phone", c.getTelefono());
            m.put("address", c.getDireccion());
            return m;
        }).collect(Collectors.toList());

        List<Map<String, Object>> products = productoRepo.findAll().stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId()); m.put("nombre", p.getNombre());
            m.put("descripcion", p.getDescripcion()); m.put("precio_base", p.getPrecioBase());
            m.put("imagen_url", p.getImagenUrl());
            return m;
        }).collect(Collectors.toList());

        List<Map<String, Object>> orders = pedidoRepo.findAll().stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());

            // FIX 1: Resolver nombre real del cliente desde la BD
            long clientId = p.getIdCliente() != null ? p.getIdCliente() : 0;
            String clientName = clienteRepo.findById(clientId)
                .map(c -> c.getNombre())
                .orElse("Sin nombre");
            m.put("client", Map.of("id", clientId, "name", clientName));

            m.put("id_producto", p.getIdProducto());

            // FIX 2: Separar 'details' (nombre producto) de 'orderNotes' (notas/CAKE)
            String rawDetalles = p.getDetalles() != null ? p.getDetalles() : "";
            // Si el campo contiene [CAKE:...], lo que está antes es el nombre del producto
            // y el campo completo es la nota de pedido
            String productDetails = rawDetalles.replaceAll("\\[CAKE:.*?\\]\\s*", "").trim();
            // Si productDetails quedó vacío (todo era CAKE), intentar obtener nombre del producto
            if (productDetails.isEmpty() && p.getIdProducto() != null) {
                productDetails = productoRepo.findById(p.getIdProducto())
                    .map(prod -> prod.getNombre())
                    .orElse(rawDetalles);
            }
            m.put("details", productDetails);
            m.put("orderNotes", rawDetalles);
            m.put("amount", p.getMonto()); m.put("discount", p.getDescuento());
            m.put("finalAmount", p.getMontoFinal()); m.put("deliveryDate", p.getFechaEntrega());
            m.put("receiptMessage", p.getMensajeRecibo()); m.put("status", p.getEstado());
            m.put("docType", p.getTipoComprobante()); m.put("ruc", p.getRucCliente());
            m.put("date", p.getFechaCreacion());
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("success", true,
                "clients", clients, "products", products, "orders", orders));
    }

    public ResponseEntity<?> loadProducts() {
        List<Map<String, Object>> prods = productoRepo.findAll().stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId()); m.put("nombre", p.getNombre());
            m.put("descripcion", p.getDescripcion()); m.put("precio_base", p.getPrecioBase());
            m.put("imagen_url", p.getImagenUrl());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("success", true, "products", prods));
    }

    public ResponseEntity<?> loadAuditLogs() {
        List<Auditoria> logs = auditoriaRepo.findAll(
                PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "fecha"))).getContent();
        return ResponseEntity.ok(Map.of("success", true, "logs", logs));
    }
}