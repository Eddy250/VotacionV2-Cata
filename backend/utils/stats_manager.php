<?php
// utils/stats_manager.php - Backend Puente: Métricas y estadísticas avanzadas CATA 2026
require_once __DIR__ . '/../models.php';

class StatsManager {

    /**
     * Calcula estadísticas para una sede específica ('central' o 'jerusalen')
     */
    private static function _calc_single_sede_stats($sedeSlug, $ngs = null) {
        $whereVoters = [];
        $paramsVoters = [];
        $whereVotos = [];
        $paramsVotos = [];

        if ($ngs && $ngs !== 'todos') {
            $whereVoters[] = 'ngs = :ngs';
            $paramsVoters['ngs'] = $ngs;
            $whereVotos[] = 'ngs = :ngs';
            $paramsVotos['ngs'] = $ngs;
        } else {
            $whereVoters[] = "(ngs NOT LIKE '%A_OS%' AND ngs NOT LIKE '%INICIAL%')";
        }

        // Total alumnos
        $sqlTotal = 'SELECT COUNT(*) FROM voters';
        if (!empty($whereVoters)) {
            $sqlTotal .= ' WHERE ' . implode(' AND ', $whereVoters);
        }
        $total_alumnos = (int)db_query($sqlTotal, $paramsVoters, $sedeSlug)->fetchColumn();

        // Total votos emitidos
        $sqlVotos = 'SELECT COUNT(*) FROM votos';
        if (!empty($whereVotos)) {
            $sqlVotos .= ' WHERE ' . implode(' AND ', $whereVotos);
        }
        $votos_emitidos = (int)db_query($sqlVotos, $paramsVotos, $sedeSlug)->fetchColumn();

        $porcentaje_participacion = ($total_alumnos > 0) ? round(($votos_emitidos / $total_alumnos) * 100, 1) : 0.0;

        // Candidatos de esta sede (incluyendo color representativo de lista)
        $candidatos = db_query('SELECT id, nombre, foto, logo, color, sede FROM candidatos ORDER BY id ASC', [], $sedeSlug)->fetchAll();

        $resultados = [];
        $chart_labels = [];
        $chart_data = [];
        $chart_colors = [];

        $defaultPalette = ['#1B3A8C', '#E11D48', '#F59E0B', '#10B981', '#8B5CF6', '#F97316', '#06B6D4', '#EC4899'];
        $colorIndex = 0;

        foreach ($candidatos as $c) {
            $sqlC = 'SELECT COUNT(*) FROM votos WHERE candidato_id = :cid';
            $paramsC = ['cid' => $c['id']];
            if (!empty($whereVotos)) {
                $sqlC .= ' AND ' . implode(' AND ', $whereVotos);
                $paramsC = array_merge($paramsC, $paramsVotos);
            }

            $votos_c = (int)db_query($sqlC, $paramsC, $sedeSlug)->fetchColumn();
            $pct_c = ($votos_emitidos > 0) ? round(($votos_c / $votos_emitidos) * 100, 1) : 0.0;

            // Determinar color de barra representativo
            $cColor = !empty($c['color']) ? trim($c['color']) : null;
            if (!$cColor) {
                if (stripos($c['nombre'], 'blanco') !== false || stripos($c['nombre'], 'nulo') !== false) {
                    $cColor = '#94A3B8';
                } else {
                    $cColor = $defaultPalette[$colorIndex % count($defaultPalette)];
                    $colorIndex++;
                }
            }

            $resultados[] = [
                'id' => (int)$c['id'],
                'nombre' => $c['nombre'],
                'foto' => $c['foto'],
                'logo' => $c['logo'],
                'color' => $cColor,
                'sede' => normalize_sede_name($sedeSlug),
                'votos' => $votos_c,
                'porcentaje' => $pct_c
            ];

            $chart_labels[] = $c['nombre'];
            $chart_data[] = $votos_c;
            $chart_colors[] = $cColor;
        }

        usort($resultados, function($a, $b) {
            return $b['votos'] <=> $a['votos'];
        });

        return [
            'sede' => normalize_sede_name($sedeSlug),
            'sede_slug' => $sedeSlug,
            'total_alumnos' => $total_alumnos,
            'votos_emitidos' => $votos_emitidos,
            'porcentaje_participacion' => $porcentaje_participacion,
            'resultados' => $resultados,
            'chart_labels' => $chart_labels,
            'chart_data' => $chart_data,
            'chart_colors' => $chart_colors
        ];
    }

    /**
     * Backend Puente: Obtiene estadísticas con filtros opcionales o consolidado general
     */
    public static function get_dashboard_stats($sede = null, $ngs = null) {
        $listas = getDistinctSedesAndNGS();

        if ($sede && $sede !== 'todos') {
            $slug = normalize_sede_slug($sede);
            $stats = self::_calc_single_sede_stats($slug, $ngs);
            $stats['filtro_actual'] = [
                'sede' => normalize_sede_name($slug),
                'ngs' => $ngs ?: 'todos'
            ];
            $stats['sedes_disponibles'] = $listas['sedes'];
            $stats['ngs_disponibles'] = $listas['ngs'];
            return $stats;
        }

        // --- CONSOLIDADO GENERAL PUENTE (AMBAS SEDES) ---
        $centralStats = self::_calc_single_sede_stats('central', $ngs);
        $jeruStats = self::_calc_single_sede_stats('jerusalen', $ngs);

        $total_alumnos = $centralStats['total_alumnos'] + $jeruStats['total_alumnos'];
        $votos_emitidos = $centralStats['votos_emitidos'] + $jeruStats['votos_emitidos'];
        $porcentaje_participacion = ($total_alumnos > 0) ? round(($votos_emitidos / $total_alumnos) * 100, 1) : 0.0;

        $resultadosConsolidados = array_merge($centralStats['resultados'], $jeruStats['resultados']);
        usort($resultadosConsolidados, function($a, $b) {
            return $b['votos'] <=> $a['votos'];
        });

        $chart_labels = [];
        $chart_data = [];
        $chart_colors = [];
        foreach ($resultadosConsolidados as $rc) {
            $chart_labels[] = $rc['nombre'] . ' (' . ($rc['sede'] === 'Sede Jerusalén' ? 'Jeru' : 'Cent') . ')';
            $chart_data[] = $rc['votos'];
            $chart_colors[] = $rc['color'] ?? '#1B3A8C';
        }

        return [
            'total_alumnos' => $total_alumnos,
            'votos_emitidos' => $votos_emitidos,
            'porcentaje_participacion' => $porcentaje_participacion,
            'resultados' => $resultadosConsolidados,
            'chart_labels' => $chart_labels,
            'chart_data' => $chart_data,
            'chart_colors' => $chart_colors,
            'sedes_desglose' => [
                'central' => $centralStats,
                'jerusalen' => $jeruStats
            ],
            'filtro_actual' => [
                'sede' => 'todos',
                'ngs' => $ngs ?: 'todos'
            ],
            'sedes_disponibles' => $listas['sedes'],
            'ngs_disponibles' => $listas['ngs']
        ];
    }
}
