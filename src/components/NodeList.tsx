import { useState } from 'react'
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Checkbox,
  Chip,
  Typography,
  Box,
  Alert,
  Tooltip,
} from '@mui/material'
import { CheckCircle, Error, HelpOutline } from '@mui/icons-material'
import type { ClusterNode } from '@/types'

interface NodeListProps {
  nodes: ClusterNode[]
  selectedNodes?: string[]
  onSelectionChange?: (selectedHostnames: string[]) => void
  selectable?: boolean
}

type Order = 'asc' | 'desc'
type OrderBy = keyof ClusterNode

const roleColors: Record<ClusterNode['role'], 'primary' | 'secondary' | 'info' | 'warning'> = {
  publisher: 'primary',
  subscriber: 'secondary',
  tftp: 'info',
  cups: 'warning',
}

const getStatusIcon = (status: ClusterNode['status']): React.ReactElement => {
  switch (status) {
    case 'online':
      return <CheckCircle color="success" fontSize="small" />
    case 'offline':
      return <Error color="error" fontSize="small" />
    case 'unknown':
    default:
      return <HelpOutline color="disabled" fontSize="small" />
  }
}

export default function NodeList({
  nodes,
  selectedNodes = [],
  onSelectionChange,
  selectable = false,
}: NodeListProps) {
  const [order, setOrder] = useState<Order>('asc')
  const [orderBy, setOrderBy] = useState<OrderBy>('hostname')

  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return
    if (event.target.checked) {
      onSelectionChange(nodes.map(node => node.hostname))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectNode = (hostname: string) => {
    if (!onSelectionChange) return
    const currentIndex = selectedNodes.indexOf(hostname)
    const newSelected = [...selectedNodes]

    if (currentIndex === -1) {
      newSelected.push(hostname)
    } else {
      newSelected.splice(currentIndex, 1)
    }

    onSelectionChange(newSelected)
  }

  const sortedNodes = [...nodes].sort((a, b) => {
    const aValue = a[orderBy]
    const bValue = b[orderBy]

    if (aValue === undefined || bValue === undefined) return 0

    if (order === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const isSelected = (hostname: string) => selectedNodes.indexOf(hostname) !== -1
  const numSelected = selectedNodes.length
  const rowCount = nodes.length

  if (nodes.length === 0) {
    return (
      <Alert severity="info">
        No cluster nodes discovered yet. Connect to CUCM to discover nodes.
      </Alert>
    )
  }

  return (
    <Paper elevation={2}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Cluster Nodes</Typography>
        {selectable && numSelected > 0 && (
          <Typography variant="body2" color="primary">
            {numSelected} of {rowCount} selected
          </Typography>
        )}
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={numSelected > 0 && numSelected < rowCount}
                    checked={rowCount > 0 && numSelected === rowCount}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'hostname'}
                  direction={orderBy === 'hostname' ? order : 'asc'}
                  onClick={() => handleRequestSort('hostname')}
                >
                  Hostname
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'ipAddress'}
                  direction={orderBy === 'ipAddress' ? order : 'asc'}
                  onClick={() => handleRequestSort('ipAddress')}
                >
                  IP Address
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'role'}
                  direction={orderBy === 'role' ? order : 'asc'}
                  onClick={() => handleRequestSort('role')}
                >
                  Role
                </TableSortLabel>
              </TableCell>
              <TableCell>Version</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'status'}
                  direction={orderBy === 'status' ? order : 'asc'}
                  onClick={() => handleRequestSort('status')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedNodes.map(node => {
              const isItemSelected = isSelected(node.hostname)
              return (
                <TableRow
                  key={node.hostname}
                  hover
                  onClick={selectable ? () => handleSelectNode(node.hostname) : undefined}
                  role={selectable ? 'checkbox' : undefined}
                  selected={isItemSelected}
                  sx={{ cursor: selectable ? 'pointer' : 'default' }}
                >
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Checkbox checked={isItemSelected} />
                    </TableCell>
                  )}
                  <TableCell>
                    <Typography variant="body2">{node.hostname}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {node.ipAddress}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={node.role.toUpperCase()}
                      color={roleColors[node.role]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {node.version || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={node.status}>{getStatusIcon(node.status)}</Tooltip>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
