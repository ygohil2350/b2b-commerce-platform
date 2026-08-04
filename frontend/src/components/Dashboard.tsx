import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import {
  Inventory2Rounded,
  MonetizationOnRounded,
  ProductionQuantityLimitsRounded,
  WarningAmberRounded,
} from "@mui/icons-material";
import { LineChart } from "@mui/x-charts/LineChart";
import { api } from "../api";
import type { Dashboard as DashboardType } from "../types";
const money = (v: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(v));
export function Dashboard() {
  const [data, setData] = useState<DashboardType | null>(null);
  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data));
  }, []);
  if (!data)
    return (
      <Box sx={{ display: "grid", placeItems: "center", height: 400 }}>
        <CircularProgress />
      </Box>
    );
  const cards = [
    ["Inventory value", money(data.inventory_value), <MonetizationOnRounded />],
    ["Products", data.total_products.toLocaleString(), <Inventory2Rounded />],
    [
      "Units on hand",
      data.total_units.toLocaleString(),
      <ProductionQuantityLimitsRounded />,
    ],
    ["Low stock", data.low_stock_count.toString(), <WarningAmberRounded />],
  ];
  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4">Operations overview</Typography>
          <Typography color="text.secondary">
            A live pulse on stock health and supply movement.
          </Typography>
        </Box>
        <Chip label="Live data" color="success" variant="outlined" />
      </Box>
      {data.low_stock_count > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {data.low_stock_count} products are at or below their reorder
          threshold.
        </Alert>
      )}
      <Grid container spacing={2}>
        {cards.map(([label, value, icon]) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={label as string}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      {label}
                    </Typography>
                    <Typography variant="h4" sx={{ mt: 1 }}>
                      {value}
                    </Typography>
                  </Box>
                  <Box className="metric-icon">{icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6">Supply movement</Typography>
          <Typography variant="body2" color="text.secondary">
            Stock received versus units allocated to orders · last 30 days
          </Typography>
          <Box sx={{ height: 320, mt: 2 }}>
            <LineChart
              xAxis={[
                {
                  data: data.trends.map((x) => new Date(x.day)),
                  scaleType: "time",
                  valueFormatter: (v: Date) =>
                    v.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    }),
                },
              ]}
              series={[
                {
                  data: data.trends.map((x) => x.stock_in),
                  label: "Stock in",
                  color: "#176b5b",
                  area: true,
                },
                {
                  data: data.trends.map((x) => x.order_out),
                  label: "Order out",
                  color: "#e3a72f",
                },
              ]}
              grid={{ horizontal: true }}
            />
          </Box>
        </CardContent>
      </Card>
    </>
  );
}
